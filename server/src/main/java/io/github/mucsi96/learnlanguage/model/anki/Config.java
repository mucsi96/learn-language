package io.github.mucsi96.learnlanguage.model.anki;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Config generated by hbm2java
 */
@Entity
@Table(name="config"
)
public class Config  implements java.io.Serializable {


     private String key;
     private int usn;
     private int mtimeSecs;
     private String val;

    public Config() {
    }

    public Config(String key, int usn, int mtimeSecs, String val) {
       this.key = key;
       this.usn = usn;
       this.mtimeSecs = mtimeSecs;
       this.val = val;
    }
   
     @Id 

    
    @Column(name="KEY", unique=true, nullable=false, length=2000000000)
    public String getKey() {
        return this.key;
    }
    
    public void setKey(String key) {
        this.key = key;
    }

    
    @Column(name="usn", nullable=false)
    public int getUsn() {
        return this.usn;
    }
    
    public void setUsn(int usn) {
        this.usn = usn;
    }

    
    @Column(name="mtime_secs", nullable=false)
    public int getMtimeSecs() {
        return this.mtimeSecs;
    }
    
    public void setMtimeSecs(int mtimeSecs) {
        this.mtimeSecs = mtimeSecs;
    }

    
    @Column(name="val", nullable=false, length=2000000000)
    public String getVal() {
        return this.val;
    }
    
    public void setVal(String val) {
        this.val = val;
    }




}


