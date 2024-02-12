package io.github.mucsi96.learnlanguage.model.anki;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * TemplatesId generated by hbm2java
 */
@Embeddable
public class TemplatesId  implements java.io.Serializable {


     private int ntid;
     private int ord;

    public TemplatesId() {
    }

    public TemplatesId(int ntid, int ord) {
       this.ntid = ntid;
       this.ord = ord;
    }
   


    @Column(name="ntid", nullable=false)
    public int getNtid() {
        return this.ntid;
    }
    
    public void setNtid(int ntid) {
        this.ntid = ntid;
    }


    @Column(name="ord", nullable=false)
    public int getOrd() {
        return this.ord;
    }
    
    public void setOrd(int ord) {
        this.ord = ord;
    }


   public boolean equals(Object other) {
         if ( (this == other ) ) return true;
		 if ( (other == null ) ) return false;
		 if ( !(other instanceof TemplatesId) ) return false;
		 TemplatesId castOther = ( TemplatesId ) other; 
         
		 return (this.getNtid()==castOther.getNtid())
 && (this.getOrd()==castOther.getOrd());
   }
   
   public int hashCode() {
         int result = 17;
         
        result = 37 * result + this.getNtid();
        result = 37 * result + this.getOrd();
         return result;
   }   


}

