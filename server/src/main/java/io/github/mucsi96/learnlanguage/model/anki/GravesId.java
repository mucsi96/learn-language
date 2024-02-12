package io.github.mucsi96.learnlanguage.model.anki;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * GravesId generated by hbm2java
 */
@Embeddable
public class GravesId  implements java.io.Serializable {


     private int oid;
     private int type;

    public GravesId() {
    }

    public GravesId(int oid, int type) {
       this.oid = oid;
       this.type = type;
    }
   


    @Column(name="oid", nullable=false)
    public int getOid() {
        return this.oid;
    }
    
    public void setOid(int oid) {
        this.oid = oid;
    }


    @Column(name="type", nullable=false)
    public int getType() {
        return this.type;
    }
    
    public void setType(int type) {
        this.type = type;
    }


   public boolean equals(Object other) {
         if ( (this == other ) ) return true;
		 if ( (other == null ) ) return false;
		 if ( !(other instanceof GravesId) ) return false;
		 GravesId castOther = ( GravesId ) other; 
         
		 return (this.getOid()==castOther.getOid())
 && (this.getType()==castOther.getType());
   }
   
   public int hashCode() {
         int result = 17;
         
        result = 37 * result + this.getOid();
        result = 37 * result + this.getType();
         return result;
   }   


}

